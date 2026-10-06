export function slugify(text: string): string {
	if (!text) return "";
	let str = text.trim().toLowerCase();
	
	// Replace accented/diacritics Vietnamese and basic Latin characters
	const from = "àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ";
	const to   = "aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyyd";
	for (let i = 0, l = from.length; i < l; i++) {
		str = str.replace(new RegExp(from[i], "g"), to[i]);
	}

	return str
		.replace(/[^a-z0-9\s-]/g, "") // remove other non-alphanumeric characters
		.replace(/\s+/g, "-")          // replace spaces with hyphens
		.replace(/-+/g, "-")           // collapse duplicate hyphens
		.replace(/^-+|-+$/g, "");      // remove leading/trailing hyphens
}
