// Try importing something that definitely exists
import { CardProps } from "@/types";

function Card({ title, children }: CardProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-4 transition cursor-pointer h-70">
      {title}
    </div>
  );
}

export default Card;
