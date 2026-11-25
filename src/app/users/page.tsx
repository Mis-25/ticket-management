import { Suspense } from "react";
import UsersView from "@/components/UsersView";

export const metadata = {
  title: "Users | Helpdesk",
};

export default function UsersPage() {
  return (
    <Suspense fallback={<p className="reply-empty">Loading users...</p>}>
      <UsersView />
    </Suspense>
  );
}
