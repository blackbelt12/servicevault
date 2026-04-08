import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function InvoicesPage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between p-4 pb-2">
        <button
          onClick={() => navigate("/more")}
          className="flex items-center gap-1 text-sm text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          More
        </button>
      </div>
      <div className="px-4">
        <h1 className="text-2xl font-bold mb-4">Invoices</h1>
        <p className="text-sm text-muted-foreground text-center mt-8">
          Invoicing coming soon.
        </p>
      </div>
    </div>
  );
}
