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
    route("api/lookup-word", "./routes/api.lookup-word.tsx"),
    route("api/add-vocabulary", "./routes/api.add-vocabulary.tsx"),
    route("api/delete-vocabulary", "./routes/api.delete-vocabulary.tsx"),
    route("api/regenerate-grammar", "./routes/api.regenerate-grammar.tsx"),
    route("api/srs-review", "./routes/api.srs-review.tsx"),
    route("api/srs-progress", "./routes/api.srs-progress.tsx"),
    route("test-srs", "./routes/test-srs.tsx"),
    route("test-api", "./routes/test-api.tsx"),
    route("test-study", "./routes/test-study.tsx"),
  ]),
  route("*", "./routes/catch-all.tsx"),
] satisfies RouteConfig;
