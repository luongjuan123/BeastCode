import React from "react";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import BeastCodeSelect, { SelectOption } from "./BeastCodeSelect";

interface BeastCodePaginationProps {
	currentPage: number;
	totalPages: number;
	onPageChange: (page: number) => void;
	pageSize?: number;
	onPageSizeChange?: (size: number) => void;
	pageSizeOptions?: number[];
	totalItems?: number;
}

const BeastCodePagination: React.FC<BeastCodePaginationProps> = ({
	currentPage,
	totalPages,
	onPageChange,
	pageSize,
	onPageSizeChange,
	pageSizeOptions = [10, 25, 50, 100],
	totalItems,
}) => {
	if (totalPages <= 1 && !onPageSizeChange) return null;

	const handlePrev = () => {
		if (currentPage > 1) onPageChange(currentPage - 1);
	};

	const handleNext = () => {
		if (currentPage < totalPages) onPageChange(currentPage + 1);
	};

	// Generate page numbers with ellipsis
	const getPageNumbers = () => {
		const pages: (number | string)[] = [];
		const maxVisible = 5;

		if (totalPages <= maxVisible) {
			for (let i = 1; i <= totalPages; i++) {
				pages.push(i);
			}
		} else {
			const start = Math.max(2, currentPage - 1);
			const end = Math.min(totalPages - 1, currentPage + 1);

			pages.push(1);

			if (start > 2) {
				pages.push("...");
			}

			for (let i = start; i <= end; i++) {
				pages.push(i);
			}

			if (end < totalPages - 1) {
				pages.push("...");
			}

			pages.push(totalPages);
		}

		return pages;
	};

	const sizeOptions: SelectOption[] = pageSizeOptions.map((opt) => ({
		value: String(opt),
		label: `${opt} / page`,
	}));

	return (
		<div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-3 px-4 font-sans text-xs border-t border-border-default bg-[var(--bg-surface)]">
			{/* Item count or summary */}
			<div className="text-text-muted">
				{totalItems !== undefined ? (
					<>
						Showing{" "}
						<span className="font-medium text-text-primary">
							{Math.min(totalItems, (currentPage - 1) * (pageSize || 25) + 1)}
						</span>{" "}
						to{" "}
						<span className="font-medium text-text-primary">
							{Math.min(totalItems, currentPage * (pageSize || 25))}
						</span>{" "}
						of <span className="font-medium text-text-primary">{totalItems}</span> records
					</>
				) : (
					<>
						Page <span className="font-medium text-text-primary">{currentPage}</span> of{" "}
						<span className="font-medium text-text-primary">{totalPages}</span>
					</>
				)}
			</div>

			{/* Page controls */}
			<div className="flex items-center gap-1.5">
				{/* Previous Button */}
				<button
					onClick={handlePrev}
					disabled={currentPage === 1}
					className="w-7 h-7 rounded-md flex items-center justify-center border border-border-default bg-[var(--bg-elevated)] text-text-secondary hover:text-text-primary hover:border-border-strong transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
					title="Previous Page"
				>
					<FaChevronLeft size={9} />
				</button>

				{/* Page Number Buttons */}
				<div className="flex items-center gap-1">
					{getPageNumbers().map((p, idx) => {
						const isCurrent = p === currentPage;
						const isEllipsis = typeof p === "string";

						if (isEllipsis) {
							return (
								<span
									key={`ellipsis-${idx}`}
									className="px-1.5 text-center text-text-muted text-xs"
								>
									...
								</span>
							);
						}

						return (
							<button
								key={`page-${p}`}
								onClick={() => onPageChange(Number(p))}
								className={`w-7 h-7 rounded-md flex items-center justify-center border text-xs font-medium transition-colors duration-150 ${
									isCurrent
										? "border-accent/40 bg-accent/10 text-accent font-semibold"
										: "border-border-default bg-[var(--bg-elevated)] text-text-secondary hover:text-text-primary hover:border-border-strong"
								}`}
							>
								{p}
							</button>
						);
					})}
				</div>

				{/* Next Button */}
				<button
					onClick={handleNext}
					disabled={currentPage === totalPages || totalPages === 0}
					className="w-7 h-7 rounded-md flex items-center justify-center border border-border-default bg-[var(--bg-elevated)] text-text-secondary hover:text-text-primary hover:border-border-strong transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
					title="Next Page"
				>
					<FaChevronRight size={9} />
				</button>

				{/* Page Size selector */}
				{onPageSizeChange && pageSize !== undefined && (
					<div className="w-24 ml-2">
						<BeastCodeSelect
							size="sm"
							options={sizeOptions}
							value={String(pageSize)}
							onChange={(val) => onPageSizeChange(Number(val))}
							placeholder={`${pageSize} / page`}
						/>
					</div>
				)}
			</div>
		</div>
	);
};

export default BeastCodePagination;
