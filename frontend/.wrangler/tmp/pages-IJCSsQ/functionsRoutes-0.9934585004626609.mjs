import { onRequest as __api___route___ts_onRequest } from "/home/adham-atya/.gemini/antigravity-ide/scratch/pos-system/frontend/functions/api/[[route]].ts"

export const routes = [
    {
      routePath: "/api/:route*",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api___route___ts_onRequest],
    },
  ]