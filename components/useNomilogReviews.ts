"use client";

import { useEffect, useState } from "react";
import { readAllReviews } from "@/lib/nomilog-data";
import { fetchRemoteReviews } from "@/lib/nomilog-remote";
import type { Review } from "@/lib/types";

export function useNomilogReviews() {
  const [reviews, setReviews] = useState<Review[]>([]);

  useEffect(() => {
    const sync = () => {
      setReviews(readAllReviews());
      void fetchRemoteReviews().then((remoteReviews) => {
        if (remoteReviews.length > 0) {
          setReviews([...readAllReviews(), ...remoteReviews]);
        }
      });
    };
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("nomilog:reviews", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("nomilog:reviews", sync);
    };
  }, []);

  return reviews;
}
