import { Icon } from "@iconify/react/dist/iconify.js";
import React from "react";

function Pagination({
  totalPages,
  page,
  setPage,
}: {
  totalPages: number;
  page: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
}): React.ReactElement {
  const renderPageNumbers = ({
    currentPage,
    totalPages,
    handlePageChange,
  }: {
    currentPage: number;
    totalPages: number;
    handlePageChange: (page: number) => void;
  }): React.ReactElement[] => {
    const pageNumbers: React.ReactElement[] = [];
    const pagesToShow = 5;

    const startPage = Math.max(1, currentPage - Math.floor(pagesToShow / 2));
    const endPage = Math.min(totalPages, startPage + pagesToShow - 1);

    if (startPage > 1) {
      if (startPage > 2) {
        pageNumbers.push(
          <>
            <button
              key={1}
              onClick={() => {
                handlePageChange(1);
              }}
              className={`rounded-md px-3 py-2  ${
                currentPage === 1
                  ? "font-semibold text-zinc-500"
                  : "text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800"
              }`}
            >
              {1}
            </button>
            <Icon icon="uil:ellipsis-h" className="text-zinc-500" />
          </>
        );
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(
        <button
          key={i}
          onClick={() => {
            handlePageChange(i);
          }}
          className={`rounded-md px-5 py-3  ${
            currentPage === i
              ? "font-semibold text-zinc-100"
              : "text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800"
          }`}
        >
          {i}
        </button>
      );
    }

    if (endPage < totalPages) {
      pageNumbers.push(
        <>
          {endPage < totalPages && (
            <Icon icon="uil:ellipsis-h" className="text-zinc-500" />
          )}
          <button
            key={totalPages}
            onClick={() => {
              handlePageChange(totalPages);
            }}
            className={`rounded-md px-5 py-3  ${
              currentPage === totalPages
                ? "font-semibold text-zinc-500"
                : "text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800"
            }`}
          >
            {totalPages}
          </button>
        </>
      );
    }

    return pageNumbers;
  };

  return (
    <div className="items-center justify-between mt-8 flex gap-2 pb-12 w-full">
      {page > 1 ? (
        <button
          onClick={() => {
            if (page > 1) {
              setPage(page - 1);
            }
          }}
          className="pr-4 pl-3 py-3 flex items-center rounded-md bg-zinc-100 text-zinc-900 font-medium"
        >
          <Icon icon="uil:angle-left" className="text-zinc-900 size-5" />
          Previous
        </button>
      ) : (
        <span className="w-32"></span>
      )}
      <div className="flex items-center gap-2">
        {renderPageNumbers({
          currentPage: page,
          totalPages: totalPages,
          handlePageChange: setPage,
        })}
      </div>
      {page < totalPages ? (
        <button
          onClick={() => {
            if (page < totalPages) {
              setPage(page + 1);
            }
          }}
          className="pl-4 pr-3 py-3 flex items-center rounded-md bg-zinc-100 text-zinc-900 font-medium"
        >
          Next
          <Icon icon="uil:angle-right" className="text-zinc-900 size-5" />
        </button>
      ) : (
        <span className="w-32"></span>
      )}
    </div>
  );
}

export default Pagination;
