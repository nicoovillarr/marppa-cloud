import {
  ResolverResult,
  withResolver,
} from "@/core/presentation/resolvers/with-resolver";
import { ResolveResult as BaseResolveResult } from "@/core/presentation/resolvers/resolver-base";

import ClientInitializer from "@/core/presentation/components/client-initializer";
import CreateNodeForm from "@/dashboard/mesh/presentation/components/createZone";

import resolver from "@/dashboard/mesh/presentation/resolvers/resolver";
import createZoneLayoutResolver from "@/dashboard/mesh/presentation/resolvers/create-zone-layout-resolver";

const resolvers = [resolver, createZoneLayoutResolver];

function Page({
  data,
}: {
  data: ResolverResult<typeof resolvers> & BaseResolveResult;
}) {
  const { user, zones, breadcrumbNodes } = data;

  return (
    <>
      <ClientInitializer
        store="layout"
        props={{
          breadcrumbNodes,
          title: null,
          subtitle: null,
        }}
      />
      <ClientInitializer
        store="app"
        props={{
          user,
          zones,
        }}
      />
      <CreateNodeForm />
    </>
  );
}

export default withResolver(resolvers)(Page);
