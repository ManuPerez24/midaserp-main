import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import type { Product } from "@/lib/types";

export interface LabelItem {
  product: Product;
  qrDataUrl: string;
  copies: number;
}

interface Props {
  items: LabelItem[];
  companyName?: string;
}

// A4: 210x297 mm. Grid 3 columnas x 8 filas = 24 etiquetas (~63x35mm cada una).
export function LabelsPdfDocument({ items, companyName }: Props) {
  const styles = StyleSheet.create({
    page: { padding: 18, fontFamily: "Helvetica", fontSize: 8 },
    grid: { flexDirection: "row", flexWrap: "wrap" },
    label: {
      width: "33.33%",
      height: 96,
      padding: 4,
    },
    inner: {
      borderWidth: 0.5,
      borderColor: "#cbd5e1",
      borderRadius: 3,
      padding: 4,
      flexDirection: "row",
      gap: 4,
      height: "100%",
    },
    qr: { width: 70, height: 70 },
    info: { flex: 1, justifyContent: "center" },
    name: { fontSize: 8, fontWeight: 700, marginBottom: 2 },
    sku: { fontSize: 7, fontFamily: "Courier", color: "#0f172a" },
    part: { fontSize: 7, color: "#475569", marginTop: 1 },
    company: { fontSize: 6, color: "#94a3b8", marginTop: 2 },
  });

  // Expand by copies
  const expanded: { product: Product; qr: string }[] = [];
  for (const it of items) {
    for (let i = 0; i < Math.max(1, it.copies); i++) {
      expanded.push({ product: it.product, qr: it.qrDataUrl });
    }
  }

  // Chunk into pages of 24
  const perPage = 24;
  const pages: typeof expanded[] = [];
  for (let i = 0; i < expanded.length; i += perPage) {
    pages.push(expanded.slice(i, i + perPage));
  }
  if (pages.length === 0) pages.push([]);

  return (
    <Document>
      {pages.map((page, idx) => (
        <Page key={idx} size="A4" style={styles.page}>
          <View style={styles.grid}>
            {page.map((cell, i) => (
              <View key={i} style={styles.label}>
                <View style={styles.inner}>
                  <Image src={cell.qr} style={styles.qr} />
                  <View style={styles.info}>
                    <Text style={styles.name}>{cell.product.name.slice(0, 40)}</Text>
                    <Text style={styles.sku}>{cell.product.sku}</Text>
                    {cell.product.partNumber ? (
                      <Text style={styles.part}>NP: {cell.product.partNumber}</Text>
                    ) : null}
                    {companyName ? <Text style={styles.company}>{companyName}</Text> : null}
                  </View>
                </View>
              </View>
            ))}
          </View>
        </Page>
      ))}
    </Document>
  );
}
