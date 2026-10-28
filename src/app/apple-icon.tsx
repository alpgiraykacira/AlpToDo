import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Kenar çubuğundaki üç çubuk işareti. iOS köşeleri kendisi yuvarladığı için zemin tam kare.
const BARS = [
  { y: 50, w: 99, a: 1 },
  { y: 80, w: 69, a: 0.7 },
  { y: 110, w: 40, a: 0.45 },
];

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: "#0B7A75" }}>
        {BARS.map((b) => (
          <div
            key={b.y}
            style={{
              position: "absolute",
              left: 41,
              top: b.y,
              width: b.w,
              height: 20,
              borderRadius: 10,
              background: `rgba(255,255,255,${b.a})`,
            }}
          />
        ))}
      </div>
    ),
    size,
  );
}
