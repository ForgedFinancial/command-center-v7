import { onRequest as __api_crm___path___js_onRequest } from "/home/clawd/command-center-v7/functions/api/crm/[[path]].js"

export const routes = [
    {
      routePath: "/api/crm/:path*",
      mountPath: "/api/crm",
      method: "",
      middlewares: [],
      modules: [__api_crm___path___js_onRequest],
    },
  ]