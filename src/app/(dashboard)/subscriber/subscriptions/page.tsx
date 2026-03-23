"use client";

import { SubscriptionList } from "@/components/subscriptions/subscription-list";

export default function SubscriberSubscriptionsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-violet-50 to-indigo-50 px-6 py-5">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-indigo-900">
            My Subscriptions
          </h2>
          <p className="mt-1 text-sm text-indigo-600/70">
            Manage your plans
          </p>
        </div>
        <svg className="hidden sm:block" width="140" height="100" viewBox="0 0 140 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Expert card 1 */}
          <rect x="8" y="20" width="50" height="60" rx="8" fill="#ede9fe" stroke="#8b5cf6" strokeWidth="1.5" />
          <circle cx="33" cy="40" r="10" fill="#ddd6fe" />
          <rect x="18" y="56" width="30" height="4" rx="2" fill="#ddd6fe" />
          <rect x="22" y="64" width="22" height="3" rx="1.5" fill="#e0e7ff" />
          {/* Expert card 2 */}
          <rect x="48" y="14" width="50" height="60" rx="8" fill="#f5f3ff" stroke="#6366f1" strokeWidth="1.5" />
          <circle cx="73" cy="34" r="10" fill="#e0e7ff" />
          <rect x="58" y="50" width="30" height="4" rx="2" fill="#ddd6fe" />
          <rect x="62" y="58" width="22" height="3" rx="1.5" fill="#e0e7ff" />
          {/* Connection line */}
          <path d="M58 50C64 44 66 44 68 34" stroke="#6366f1" strokeWidth="1.5" strokeDasharray="3 2" opacity="0.4" />
          {/* Recurring / refresh icon */}
          <path d="M110 35C110 27 116 22 123 22C130 22 135 27 135 35" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" fill="none" />
          <path d="M133 30L135 35L130 35" fill="#6366f1" />
          <path d="M135 55C135 63 130 68 123 68C116 68 110 63 110 55" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" fill="none" />
          <path d="M112 60L110 55L115 55" fill="#8b5cf6" />
          {/* Badge */}
          <circle cx="120" cy="80" r="8" fill="#6366f1" opacity="0.2" />
          <path d="M116 80L119 83L125 77" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      <SubscriptionList />
    </div>
  );
}
