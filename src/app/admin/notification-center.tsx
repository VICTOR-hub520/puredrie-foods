"use client";

import Link from "next/link";
import { useState } from "react";

type Notification = {
  id: string;
  title: string;
  message: string;
  href: string | null;
  createdAt: string;
};

export function AdminNotificationCenter({ notifications }: { notifications: Notification[] }) {
  const [items, setItems] = useState(notifications);
  const [error, setError] = useState("");

  async function markAsRead(id: string) {
    setError("");
    try {
      const response = await fetch(`/api/notifications/${id}`, { method: "PATCH" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not update notification.");
      setItems((current) => current.filter((item) => item.id !== id));
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Could not update notification.");
    }
  }

  return (
    <section className="admin-card notification-center" aria-labelledby="admin-notifications-heading">
      <div className="admin-card-heading">
        <div><span className="eyebrow">Needs your attention</span><h2 id="admin-notifications-heading">Unread notifications</h2></div>
        <span className="notification-count" aria-label={`${items.length} unread notifications`}>{items.length}</span>
      </div>
      {error && <p className="form-alert" role="alert">{error}</p>}
      {items.length ? (
        <ul className="notification-list">
          {items.map((item) => (
            <li key={item.id}>
              <div><strong>{item.title}</strong><p>{item.message}</p><time dateTime={item.createdAt}>{new Intl.DateTimeFormat("en-KE", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Nairobi" }).format(new Date(item.createdAt))}</time></div>
              <div className="notification-actions">
                {item.href && <Link className="underlined-link" href={item.href}>View</Link>}
                <button className="text-button" type="button" onClick={() => markAsRead(item.id)}>Mark read</button>
              </div>
            </li>
          ))}
        </ul>
      ) : <p className="notification-empty">You’re all caught up.</p>}
    </section>
  );
}
