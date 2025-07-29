import { Outlet } from "react-router";
import Navigation from "../components/Navigation";

export default function Layout() {
  return (
    <>
      <Navigation />
      <Outlet />
    </>
  );
} 