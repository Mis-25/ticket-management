import { Suspense } from "react";
import TicketDetailView from "@/components/TicketDetailView";

export const metadata = {
  title: "Ticket Details | Helpdesk",
};

export default function TicketDetailPage() {
  return (
    <Suspense fallback={<p className="reply-empty">Loading ticket...</p>}>
      <TicketDetailView />
    </Suspense>
  );
}
