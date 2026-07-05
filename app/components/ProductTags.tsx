type ProductTagsProps = {
  tags?: string[];
};

export default function ProductTags({ tags }: ProductTagsProps) {
  if (!tags?.length) {
    return null;
  }

  return (
    <ul className="mt-2 flex flex-wrap gap-1.5 sm:mt-3 sm:gap-2">
      {tags.map((tag) => (
        <li
          key={tag}
          className="rounded-md border border-dark-green/20 bg-beige/40 px-2 py-0.5 text-[10px] font-medium text-dark-green sm:px-2.5 sm:py-1 sm:text-xs"
        >
          {tag}
        </li>
      ))}
    </ul>
  );
}
