import {
  ResolverResult,
  withResolver,
} from "@/core/presentation/resolvers/with-resolver";
import { ResolveResult as BaseResolveResult } from "@/core/presentation/resolvers/resolver-base";

import ZoneDetails from "@/dashboard/mesh/presentation/components/zoneDetails";

import zoneDetailsResolver from "@/dashboard/mesh/presentation/resolvers/zone-details-resolver";
import zoneDetailsLayoutResolver from "@/dashboard/mesh/presentation/resolvers/zone-details-layout-resolver";
import ClientInitializer from "@/core/presentation/components/client-initializer";

const resolvers = [zoneDetailsResolver, zoneDetailsLayoutResolver];

function Page({
  data,
}: {
  data: ResolverResult<typeof resolvers> & BaseResolveResult;
}) {
  const { user, zones, breadcrumbNodes, title, subtitle } = data;

  return (
    <>
      <ClientInitializer
        store="layout"
        props={{
          breadcrumbNodes,
          title,
          subtitle,
        }}
      />
      <ClientInitializer
        store="app"
        props={{
          user,
          zones,
        }}
      />
      <ZoneDetails />
    </>
  );
}

export default withResolver(resolvers)(Page);
