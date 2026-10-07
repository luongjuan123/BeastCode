import { chromium } from "playwright";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

const PAGES_TO_TEST = [
  "/",
  "/auth",
  "/rankings",
  "/contests",
  "/threads",
  "/orgs",
  "/search",
  "/problems/two-sum",
  "/settings",
  "/profile",
  "/messages",
  "/account-appeal",
  "/admin",
];

function parseRgb(colorStr) {
  if (!colorStr) return null;
  const match = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (!match) return null;
  return {
    r: parseInt(match[1], 10),
    g: parseInt(match[2], 10),
    b: parseInt(match[3], 10),
    a: match[4] !== undefined ? parseFloat(match[4]) : 1,
  };
}

function getLuminance(r, g, b) {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function getContrast(rgb1, rgb2) {
  const lum1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
  const lum2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

// Blend foreground rgba over background rgb
function blendRgba(fg, bg) {
  const alpha = fg.a;
  return {
    r: Math.round(fg.r * alpha + bg.r * (1 - alpha)),
    g: Math.round(fg.g * alpha + bg.g * (1 - alpha)),
    b: Math.round(fg.b * alpha + bg.b * (1 - alpha)),
    a: 1,
  };
}

async function auditPage(page, route) {
  console.log(`\n========================================`);
  console.log(`Auditing page: ${route}`);
  console.log(`========================================`);

  try {
    await page.goto(`${BASE_URL}${route}`, { waitUntil: "networkidle", timeout: 15000 });
  } catch (err) {
    console.log(`Navigation warning for ${route}:`, err.message);
  }

  // Evaluate all elements in the DOM
  const issues = await page.evaluate(() => {
    const results = [];

    function parseColor(str) {
      if (!str) return null;
      const m = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
      if (!m) return null;
      return {
        r: parseInt(m[1], 10),
        g: parseInt(m[2], 10),
        b: parseInt(m[3], 10),
        a: m[4] !== undefined ? parseFloat(m[4]) : 1,
      };
    }

    function getLuminance(r, g, b) {
      const a = [r, g, b].map((v) => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      });
      return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
    }

    function contrastRatio(lum1, lum2) {
      return (Math.max(lum1, lum2) + 0.05) / (Math.min(lum1, lum2) + 0.05);
    }

    function getEffectiveBg(el) {
      let curr = el;
      let layers = [];
      while (curr && curr !== document.documentElement) {
        const style = window.getComputedStyle(curr);
        const bg = parseColor(style.backgroundColor);
        if (bg && bg.a > 0) {
          layers.unshift(bg);
          if (bg.a >= 0.99) break; // fully opaque
        }
        curr = curr.parentElement;
      }
      // default page background is #080909 -> { r: 8, g: 9, b: 9, a: 1 }
      let composite = { r: 8, g: 9, b: 9, a: 1 };
      for (const layer of layers) {
        composite = {
          r: Math.round(layer.r * layer.a + composite.r * (1 - layer.a)),
          g: Math.round(layer.g * layer.a + composite.g * (1 - layer.a)),
          b: Math.round(layer.b * layer.a + composite.b * (1 - layer.a)),
          a: 1,
        };
      }
      return composite;
    }

    // Selector for interactive & visible components
    const elements = document.querySelectorAll("button, a, input, select, textarea, [role='button'], [role='tab'], th, td, h1, h2, h3, h4, p, span, label, svg");

    elements.forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const style = window.getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden" || parseFloat(style.opacity) < 0.05) {
        // Check if it's supposed to be visible
        if (el.tagName === "BUTTON" || el.tagName === "A") {
          results.push({
            type: "HIDDEN_INTERACTIVE",
            tagName: el.tagName,
            text: (el.innerText || "").slice(0, 40),
            classes: el.className,
            opacity: style.opacity,
            visibility: style.visibility,
          });
        }
        return;
      }

      const effectiveBg = getEffectiveBg(el);
      const bgLum = getLuminance(effectiveBg.r, effectiveBg.g, effectiveBg.b);

      // Check text contrast if there's direct text
      const hasDirectText = Array.from(el.childNodes).some(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim().length > 0);
      if (hasDirectText || ["BUTTON", "INPUT", "SELECT", "TH", "TD", "H1", "H2", "H3", "H4", "LABEL"].includes(el.tagName)) {
        const text = (el.innerText || (el.value ? el.value : (el.placeholder ? el.placeholder : ""))).trim();
        if (text.length > 0) {
          const color = parseColor(style.color);
          if (color) {
            const compositeColor = {
              r: Math.round(color.r * color.a + effectiveBg.r * (1 - color.a)),
              g: Math.round(color.g * color.a + effectiveBg.g * (1 - color.a)),
              b: Math.round(color.b * color.a + effectiveBg.b * (1 - color.a)),
            };
            const textLum = getLuminance(compositeColor.r, compositeColor.g, compositeColor.b);
            const ratio = contrastRatio(textLum, bgLum);

            const isButton = el.tagName === "BUTTON" || el.getAttribute("role") === "button";
            const isInput = el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT";

            if (ratio < 2.5) {
              results.push({
                severity: "CRITICAL_LOW_CONTRAST",
                tagName: el.tagName,
                text: text.slice(0, 50),
                classes: typeof el.className === "string" ? el.className : "",
                contrastRatio: ratio.toFixed(2),
                color: style.color,
                bg: `rgb(${effectiveBg.r}, ${effectiveBg.g}, ${effectiveBg.b})`,
                isButton,
                isInput,
              });
            } else if (ratio < 3.5 && (isButton || isInput || el.tagName.startsWith("H"))) {
              results.push({
                severity: "WARNING_LOW_CONTRAST",
                tagName: el.tagName,
                text: text.slice(0, 50),
                classes: typeof el.className === "string" ? el.className : "",
                contrastRatio: ratio.toFixed(2),
                color: style.color,
                bg: `rgb(${effectiveBg.r}, ${effectiveBg.g}, ${effectiveBg.b})`,
                isButton,
                isInput,
              });
            }
          }
        }
      }

      // Check Buttons specifically: is the button itself distinguishable from its surrounding parent?
      if (el.tagName === "BUTTON" || el.getAttribute("role") === "button") {
        const parentBg = getEffectiveBg(el.parentElement || document.body);
        const btnBgStyle = parseColor(style.backgroundColor);
        const hasBorder = style.borderWidth && parseFloat(style.borderWidth) > 0 && style.borderStyle !== "none";
        const borderColor = parseColor(style.borderColor);

        // If button background is identical or near identical to parent background,
        // and border is transparent or identical to parent background:
        const btnBg = btnBgStyle && btnBgStyle.a > 0 ? btnBgStyle : parentBg;
        const btnBgLum = getLuminance(btnBg.r, btnBg.g, btnBg.b);
        const parentBgLum = getLuminance(parentBg.r, parentBg.g, parentBg.b);
        const bgDiff = contrastRatio(btnBgLum, parentBgLum);

        const borderDistinguishable = hasBorder && borderColor && borderColor.a > 0.1 &&
          contrastRatio(getLuminance(borderColor.r, borderColor.g, borderColor.b), parentBgLum) > 1.2;

        // If no background distinction and no border distinction, is it a ghost button?
        // Ghost button must have high-contrast icon or text.
        const textOrIconColor = parseColor(style.color);
        if (textOrIconColor) {
          const textLum = getLuminance(textOrIconColor.r, textOrIconColor.g, textOrIconColor.b);
          const textRatio = contrastRatio(textLum, parentBgLum);
          if (textRatio < 2.5) {
            results.push({
              severity: "CRITICAL_INVISIBLE_BUTTON",
              tagName: "BUTTON",
              text: (el.innerText || "").slice(0, 40),
              classes: typeof el.className === "string" ? el.className : "",
              bgDiff: bgDiff.toFixed(2),
              textRatio: textRatio.toFixed(2),
              color: style.color,
              bg: style.backgroundColor,
            });
          }
        }
      }

      // Check inputs: inputs must have visible boundaries
      if (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT") {
        const parentBg = getEffectiveBg(el.parentElement || document.body);
        const inputBg = getEffectiveBg(el);
        const inputBgLum = getLuminance(inputBg.r, inputBg.g, inputBg.b);
        const parentBgLum = getLuminance(parentBg.r, parentBg.g, parentBg.b);
        const bgDiff = contrastRatio(inputBgLum, parentBgLum);

        const hasBorder = style.borderWidth && parseFloat(style.borderWidth) > 0 && style.borderStyle !== "none";
        const borderColor = parseColor(style.borderColor);
        const borderLum = borderColor ? getLuminance(borderColor.r, borderColor.g, borderColor.b) : 0;
        const borderDiff = borderColor ? contrastRatio(borderLum, parentBgLum) : 1;

        if (bgDiff < 1.05 && (!hasBorder || borderDiff < 1.15)) {
          results.push({
            severity: "CRITICAL_BORDERLESS_INPUT",
            tagName: el.tagName,
            classes: typeof el.className === "string" ? el.className : "",
            type: el.getAttribute("type") || "text",
            placeholder: el.getAttribute("placeholder") || "",
          });
        }
      }

      // Check SVGs / Icons:
      if (el.tagName === "svg") {
        const fill = style.fill;
        const stroke = style.stroke;
        const color = parseColor(style.color);
        let iconColor = null;
        if (fill && fill !== "none") {
          iconColor = fill === "currentColor" ? color : parseColor(fill);
        } else if (stroke && stroke !== "none") {
          iconColor = stroke === "currentColor" ? color : parseColor(stroke);
        } else {
          iconColor = color;
        }

        if (iconColor) {
          const iconLum = getLuminance(iconColor.r, iconColor.g, iconColor.b);
          const iconRatio = contrastRatio(iconLum, bgLum);
          if (iconRatio < 2.0) {
            results.push({
              severity: "CRITICAL_LOW_CONTRAST_ICON",
              tagName: "SVG",
              classes: typeof el.className === "string" ? el.className : (el.getAttribute("class") || ""),
              parentText: (el.parentElement?.innerText || "").slice(0, 30),
              iconRatio: iconRatio.toFixed(2),
              iconColor: `${iconColor.r}, ${iconColor.g}, ${iconColor.b}`,
              bg: `rgb(${effectiveBg.r}, ${effectiveBg.g}, ${effectiveBg.b})`,
            });
          }
        }
      }
    });

    return results;
  });

  console.log(`Audited ${route}: found ${issues.length} potential issues.`);
  if (issues.length > 0) {
    console.log(JSON.stringify(issues.slice(0, 15), null, 2));
  }
  return { route, issues };
}

(async () => {
  const browser = await chromium.launch({
    executablePath: "/usr/bin/google-chrome",
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });

  const allReports = [];
  for (const route of PAGES_TO_TEST) {
    const report = await auditPage(page, route);
    allReports.push(report);
  }

  // Also test mobile viewport
  console.log(`\n--- Mobile Viewport Test (375x667) ---`);
  await page.setViewportSize({ width: 375, height: 667 });
  for (const route of ["/", "/auth", "/problems/two-sum", "/contests"]) {
    const report = await auditPage(page, route);
    allReports.push({ route: `${route} [mobile]`, issues: report.issues });
  }

  await browser.close();

  const totalIssues = allReports.reduce((sum, r) => sum + r.issues.length, 0);
  console.log(`\nTotal potential issues detected across tested pages: ${totalIssues}`);
})();
