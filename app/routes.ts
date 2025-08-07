import {
  type RouteConfig,
  route,
  layout,
  index,
} from "@react-router/dev/routes";

export default [
  layout("./routes/layout.tsx", [
    index("./routes/_index.tsx"),
    route("sign-in", "./routes/sign-in.tsx"),
    route("sign-in/sso-callback", "./routes/sign-in.sso-callback.tsx"),
    route("sign-up", "./routes/sign-up.tsx"),
    route("sign-up/sso-callback", "./routes/sign-up.sso-callback.tsx"),
    route("lessons", "./routes/lessons._index.tsx"),
    route("lessons/:id", "./routes/lessons.$id.tsx"),
    route("generate-lesson", "./routes/generate-lesson.tsx"),
    route("api/delete-lesson", "./routes/api.delete-lesson.tsx"),
    route("api/lookup-word", "./routes/api.lookup-word.tsx"),
    route("api/add-vocabulary", "./routes/api.add-vocabulary.tsx"),
    route("api/delete-vocabulary", "./routes/api.delete-vocabulary.tsx"),
    route("api/regenerate-grammar", "./routes/api.regenerate-grammar.tsx"),
    route("api/srs-review", "./routes/api.srs-review.tsx"),
    route("api/srs-progress", "./routes/api.srs-progress.tsx"),
    route("api/vocabulary-stats", "./routes/api.vocabulary-stats.tsx"),
  ]),
  route("*", "./routes/catch-all.tsx"),
] satisfies RouteConfig;
