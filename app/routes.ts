import {
  type RouteConfig,
  route,
  layout,
  index,
} from "@react-router/dev/routes";

export default [
  layout("./routes/layout.tsx", [
    index("./routes/_index.tsx"),
    route("lessons/:id", "./routes/lessons.$id.tsx"),
    route("generate-lesson", "./routes/generate-lesson.tsx"),
  ]),
] satisfies RouteConfig;
