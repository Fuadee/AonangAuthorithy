type LocationPreviewProps = {
  latitude: number;
  longitude: number;
};

function buildEmbedUrl(latitude: number, longitude: number): string {
  const delta = 0.01;
  const left = longitude - delta;
  const right = longitude + delta;
  const top = latitude + delta;
  const bottom = latitude - delta;

  return `https://www.openstreetmap.org/export/embed.html?bbox=${left}%2C${bottom}%2C${right}%2C${top}&layer=mapnik&marker=${latitude}%2C${longitude}`;
}

export function LocationPreview({ latitude, longitude }: LocationPreviewProps) {
  return (
    <iframe
      className="mt-3 h-52 w-full rounded-lg border border-slate-200"
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
      src={buildEmbedUrl(latitude, longitude)}
      title="ตำแหน่งบนแผนที่"
    />
  );
}
