type ProductPriceProps = {
  price: string;
  discountPrice?: string | null;
  className?: string;
  originalClassName?: string;
};

/** Shows discount price when set; otherwise the regular price. */
export default function ProductPrice({
  price,
  discountPrice,
  className = "font-bold text-dark-green",
  originalClassName = "ml-2 font-medium text-dark-green/45 line-through",
}: ProductPriceProps) {
  const hasDiscount = Boolean(discountPrice?.trim());

  if (!hasDiscount) {
    return <p className={className}>{price}</p>;
  }

  return (
    <p className={className}>
      <span>{discountPrice}</span>
      <span className={originalClassName}>{price}</span>
    </p>
  );
}

export function getEffectivePrice(
  price: string,
  discountPrice?: string | null,
): string {
  const trimmed = discountPrice?.trim();
  return trimmed ? trimmed : price;
}
