import QRCode from "react-qr-code";

interface QRCodeGeneratorProps {
    url: string;
    size?: number;
    // 'simple' prop is deprecated as this component is now always simple
}

export function QRCodeGenerator({ url }: QRCodeGeneratorProps) {
    return (
        <div style={{ height: "100%", width: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <QRCode
                size={256}
                style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                value={url}
                viewBox={`0 0 256 256`}
                fgColor="#2d3748"
                bgColor="#ffffff"
                level="H"
            />
        </div>
    );
}
