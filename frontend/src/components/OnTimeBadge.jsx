// src/components/OnTimeBadge.jsx
// on_time: true = tepat waktu, false = telat, null/undefined = dikecualikan
// dari perhitungan (BROKEN untuk PM Part) atau data lama sebelum fitur
// Ketepatan PM ada (lihat migration 1700000012000).
function OnTimeBadge({ onTime }) {
    if (onTime === null || onTime === undefined) {
        return (
            <span className="badge badge-muted" title="Dikecualikan dari perhitungan, atau data lama sebelum fitur ini ada">
                <span className="dot" />-
            </span>
        );
    }
    if (onTime) {
        return (
            <span className="badge badge-ok">
                <span className="dot" />
                Tepat waktu
            </span>
        );
    }
    return (
        <span className="badge badge-danger">
            <span className="dot" />
            Telat
        </span>
    );
}

export default OnTimeBadge;