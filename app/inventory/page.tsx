import { redirect } from 'next/navigation';

export default async function InventoryPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>;
}) {
  const params = await searchParams;
  const tab = params?.tab ? `&tab=${params.tab}` : '';
  redirect(`/planstructino?view=materials${tab}`);
}
