export function OctahedronLogo() {
  const topFaces = [0, 90, 180, 270];
  const bottomFaces = [0, 90, 180, 270];

  return (
    <div className="octahedron-scene" aria-label="TrainerBoard logo">
      <div className="octahedron-core">
        {topFaces.map((deg, index) => (
          <span
            key={`top-${deg}`}
            className={`octahedron-face octahedron-face-top octahedron-face-top-${(index % 4) + 1}`}
            style={{ ["--ry" as string]: `${deg}deg` }}
          />
        ))}
        {bottomFaces.map((deg, index) => (
          <span
            key={`bottom-${deg}`}
            className={`octahedron-face octahedron-face-bottom octahedron-face-bottom-${(index % 4) + 1}`}
            style={{ ["--ry" as string]: `${deg}deg` }}
          />
        ))}
      </div>
      <span className="octahedron-glow" />
    </div>
  );
}
