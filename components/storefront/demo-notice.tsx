export function DemoStorefrontNotice() {
  return (
    <aside
      aria-label="Demo storefront setup"
      className="border-b border-amber-300 bg-amber-50 px-5 py-3 text-center text-sm text-amber-950"
    >
      <strong>Demo storefront:</strong> this deployment is using sample products. Add your Shopify
      Storefront domain and public token in the deployment settings, then redeploy.
    </aside>
  );
}
