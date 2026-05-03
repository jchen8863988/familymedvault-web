import Link from "next/link";

/** Fallback when no locale segment (rare); keep minimal English. */
export default function GlobalNotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center bg-white px-6 py-20 text-center text-slate-900">
      <p className="text-sm font-medium text-teal-700">404</p>
      <h1 className="mt-2 text-3xl font-bold">Page not found</h1>
      <p className="mt-4 max-w-md text-slate-600">
        This page does not exist or the link is incorrect.
      </p>
      <Link
        href="/"
        className="mt-10 rounded-2xl bg-slate-900 px-8 py-3 text-white transition hover:bg-slate-800"
      >
        Back to home
      </Link>
    </div>
  );
}
