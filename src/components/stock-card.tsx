// Try importing something that definitely exists
import { CardProps } from "@/types";

function StockCard(props: Readonly<CardProps>) {
  const { symbol, children } = props;
  return (
    <div className="bg-white rounded-lg shadow-md p-4 transition cursor-pointer h-70 overflow-auto">
      <div className="flex flex-row items-center gap-1">
        <h2>{symbol}</h2>
        <h4 className="text-green-600 -mb-1">{"+0.21%"}</h4>
      </div>
    </div>
  );
}

export default StockCard;
