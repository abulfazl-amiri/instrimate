import { ApiStatus } from "./api-status";

export default function Home() {
  return (
    <main className="mx-auto max-w-xl p-8">
      <h1 className="text-3xl font-semibold">Instrimate</h1>
      <p className="mt-2 text-gray-600">
        Helps teachers manage their classes wisely and efficiently.
      </p>
      <ApiStatus />
    </main>
  );
}
