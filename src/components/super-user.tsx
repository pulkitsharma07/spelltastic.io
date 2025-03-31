"use client";

import { useState, useEffect } from "react";

export default function SuperUser() {
  const [isSuperUser, setIsSuperUser] = useState(false);

  useEffect(() => {
    const isSuperUser = document.cookie.includes("__SUPERUSER");
    setIsSuperUser(isSuperUser);
  }, []);

  return <>{isSuperUser ? <p className="text-red-500">SuperUser</p> : <></>}</>;
}
