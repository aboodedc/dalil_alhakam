import { Card, CardContent } from "@/components/ui/card";

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center gap-2 p-8 text-center">
        <p className="font-medium">{title}</p>
        {hint ? <p className="text-sm text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}
