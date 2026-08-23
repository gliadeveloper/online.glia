type ShopListHeaderProps = {
  productCount: number;
};

export function ShopListHeader({ productCount }: ShopListHeaderProps) {
  return (
    <header className="glia-shop__head">
      <p className="glia-shop__kicker">Shop</p>
      <div className="glia-shop__head-row">
        <h1 className="glia-shop__title">상품</h1>
        {productCount > 0 ? <p className="glia-shop__count">{productCount}</p> : null}
      </div>
      <p className="glia-shop__lede">강의와 코칭을 둘러보고 신청하세요.</p>
    </header>
  );
}
