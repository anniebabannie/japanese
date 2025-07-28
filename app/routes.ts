import {
  type RouteConfig,
  route,
  index,
} from "@react-router/dev/routes";

export default [
  index("./routes/_index.tsx"),
  route("lessons/:id", "./routes/lessons.$id.tsx"),
] satisfies RouteConfig;
