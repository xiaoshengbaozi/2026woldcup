export type Team = {
  badge: string;
  badgeType: "code" | "image";
  image: string;
  name: string;
};

export type Match = {
  uid: string;
  summary: string;
  description: string;
  location: string;
  url: string;
  start: Date;
  end: Date | null;
  geo: {
    lat: number;
    lon: number;
  } | null;
  stage: string;
  weather: string;
};

export type DetailRow = {
  icon: string;
  text: string;
  type: "venue" | "meta";
};
