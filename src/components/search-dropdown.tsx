import { SearchDropdownProps } from "@/types";
import { useEffect, useRef, useState } from "react";

interface SearchDropdownWithKeyboardProps extends SearchDropdownProps {
  selectedIndex: number;
  onKeyboardSelect: (index: number) => void;
}

export const SearchDropdown = ({
  searchResults,
  isVisible,
  onSelectStock,
  onClose,
  isSearching,
  selectedIndex,
  onKeyboardSelect,
}: SearchDropdownWithKeyboardProps) => {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selectedItemRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    if (isVisible) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isVisible, onClose]);

  // Scroll selected item into view
  useEffect(() => {
    if (selectedItemRef.current && selectedIndex >= 0) {
      selectedItemRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [selectedIndex]);

  if (!isVisible) return null;

  let dropdownContent;
  if (isSearching) {
    dropdownContent = (
      <div className="p-3 text-center text-sm">
        <div className="animate-spin inline-block w-4 h-4 border-2 border-gray-300 dark:border-slate-600 border-t-blue-500 rounded-full mr-2"></div>
        Searching...
      </div>
    );
  } else if (searchResults.length === 0) {
    dropdownContent = (
      <div className="p-3 text-center text-sm">No results found</div>
    );
  } else {
    dropdownContent = (
      <ul className="py-1" role="listbox">
        {searchResults.map((result, index) => (
          <li key={result.symbol} role="option">
            <button
              ref={index === selectedIndex ? selectedItemRef : null}
              onClick={() => onSelectStock(result.symbol)}
              onMouseEnter={() => onKeyboardSelect(index)}
              className={`w-full px-3 py-2 text-left cursor-pointer border-b-1 border-gray-200 dark:border-slate-600 transition-colors ${
                index === selectedIndex
                  ? "bg-blue-100  dark:bg-slate-700"
                  : "hover:bg-gray-100  dark:hover:bg-slate-700 dark:focus:bg-slate-700"
              } focus:outline-none`}
            >
              <div className="flex items-baseline gap-2">
                <span className="font-medium text-gray-900 dark:text-white">
                  {result.symbol}
                </span>
                <span className="text-sm text-gray-500">
                  {result.description}
                </span>
              </div>
            </button>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div
      ref={dropdownRef}
      className="absolute top-13 left-0 right-0 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto"
      role="listbox"
      aria-label="Search results"
    >
      {dropdownContent}
    </div>
  );
};
