"use client";

import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <h1 className="text-2xl font-bold">Something went wrong</h1>
      <Alert variant="destructive" className="w-fit">
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
