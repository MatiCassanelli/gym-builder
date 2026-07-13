import { Link } from 'react-router-dom';

interface BreadcrumbProps {
  title: string;
  isPreview?: boolean;
  onBuilderClick?: () => void;
}

export default function Breadcrumb({ title, isPreview, onBuilderClick }: BreadcrumbProps) {
  return (
    <div className="flex items-center gap-2.5 px-8 py-3.5 bg-stone-100 border-b border-stone-200">
      <Link
        to="/"
        className="flex items-center gap-1.5 text-[13.5px] font-semibold text-stone-500 no-underline"
      >
        <span className="text-base">←</span> Rutinas
      </Link>
      {isPreview && onBuilderClick ? (
        <>
          <span className="text-stone-300">/</span>
          <button
            type="button"
            onClick={onBuilderClick}
            className="text-[13.5px] font-semibold text-stone-500 cursor-pointer bg-transparent border-none p-0"
          >
            {title}
          </button>
          <span className="text-stone-300">/</span>
          <div className="text-[13.5px] font-bold text-stone-900">
            Vista previa / PDF
          </div>
        </>
      ) : (
        <>
          <span className="text-stone-300">/</span>
          <div className="text-[13.5px] font-bold text-stone-900">{title}</div>
        </>
      )}
    </div>
  );
}
