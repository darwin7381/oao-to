import { useRef } from 'react';
import QRCode from "react-qr-code";
import { Download } from 'lucide-react';
import { Button } from './ui/Button';
import { Card } from './ui/Card';

interface QRCodeGeneratorProps {
    url: string;
    size?: number;
}

export function QRCodeGenerator({ url, size = 200 }: QRCodeGeneratorProps) {
    const svgRef = useRef<any>(null);

    const downloadQRCode = () => {
        const svg = svgRef.current;
        if (!svg) return;

        const svgData = new XMLSerializer().serializeToString(svg);
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const img = new Image();

        img.onload = () => {
            canvas.width = size;
            canvas.height = size;
            ctx?.drawImage(img, 0, 0);
            const pngFile = canvas.toDataURL("image/png");
            const downloadLink = document.createElement("a");
            downloadLink.download = `oao-qr-${Date.now()}.png`;
            downloadLink.href = pngFile;
            downloadLink.click();
        };

        img.src = "data:image/svg+xml;base64," + btoa(svgData);
    };

    return (
        <div className="flex flex-col items-center gap-4 p-4">
            <div className="p-4 bg-white rounded-3xl shadow-sm border border-orange-100">
                <QRCode
                    ref={svgRef as any}
                    value={url}
                    size={size}
                    fgColor="#2d3748"
                    bgColor="#ffffff"
                    level="H"
                />
            </div>
            <Button
                onClick={downloadQRCode}
                variant="secondary"
                size="sm"
                className="rounded-full shadow-orange-200/50 hover:shadow-orange-200"
            >
                <Download className="w-4 h-4 mr-2" />
                Save Image
            </Button>
        </div>
    );
}
