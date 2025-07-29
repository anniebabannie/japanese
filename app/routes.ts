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
    route("api/delete-lesson", "./routes/api.delete-lesson.tsx"),
  ]),
  route("*", "./routes/catch-all.tsx"),
] satisfies RouteConfig;
