type TokenBadgeProps = {
  symbol: string;
  iconSrc: string;
};

export default function TokenBadge(props: TokenBadgeProps) {
  return (
    <div className="flex h-full w-[111px] items-center justify-between rounded-[46px] border border-[#363636] bg-[#212121] text-white">
      <div className="flex items-center justify-center">
        <img
          className="m-2.5 w-[25px]"
          src={props.iconSrc}
          alt={props.symbol}
        />
        <p className="text-center text-[15px]">{props.symbol}</p>
      </div>
    </div>
  );
}
