import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { Quote, AppSettings, QuoteLine } from "@/lib/types";
import { formatDate } from "@/lib/utils";

interface Props {
  supplier: string;
  lines: QuoteLine[];
  quote: Quote;
  settings: AppSettings;
}

export function PurchasePdfDocument({ supplier, lines, quote, settings }: Props) {
  const { issuer, pdf } = settings;
  const styles = StyleSheet.create({
    page: { padding: 32, fontSize: 10, fontFamily: "Helvetica", color: "#1f2937" },
    header: {
      backgroundColor: pdf.headerColor,
      color: "#ffffff",
      padding: 14,
      borderRadius: 8,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 14,
    },
    title: { fontSize: 14, fontWeight: 700, color: "#ffffff" },
    sub: { fontSize: 9, color: "#e5edff", marginTop: 2 },
    folio: { fontSize: 14, fontWeight: 700, color: "#ffffff" },
    info: {
      flexDirection: "row",
      gap: 10,
      marginBottom: 12,
    },
    card: {
      flex: 1,
      borderWidth: 1,
      borderColor: "#e5e7eb",
      borderRadius: 6,
      padding: 8,
      backgroundColor: "#fafbfc",
    },
    cardTitle: {
      fontSize: 8,
      color: pdf.accentColor,
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: 1,
      marginBottom: 3,
    },
    cardLine: { fontSize: 9, marginBottom: 1 },
    tableHeader: {
      flexDirection: "row",
      backgroundColor: pdf.accentColor,
      color: "#ffffff",
      paddingVertical: 6,
      paddingHorizontal: 8,
      borderRadius: 4,
      marginBottom: 4,
      fontSize: 9,
      fontWeight: 700,
    },
    row: {
      flexDirection: "row",
      paddingVertical: 6,
      paddingHorizontal: 8,
      borderBottomWidth: 0.5,
      borderBottomColor: "#e5e7eb",
    },
    rowAlt: { backgroundColor: "#f3f4f6" },
    cellNum: { width: "5%" },
    cellPart: { width: "20%", paddingRight: 4, fontFamily: "Courier", fontSize: 9 },
    cellName: { width: "55%", paddingRight: 4 },
    cellQty: { width: "10%", textAlign: "right" },
    cellUnit: { width: "10%", textAlign: "right" },
    productName: { fontSize: 10, fontWeight: 700 },
    productDesc: { fontSize: 8, color: "#6b7280", marginTop: 1 },
    skuSmall: { fontSize: 7, color: "#9ca3af", marginTop: 1 },
    summary: {
      marginTop: 16,
      flexDirection: "row",
      justifyContent: "space-between",
      borderTopWidth: 1,
      borderTopColor: "#e5e7eb",
      paddingTop: 8,
    },
    footer: {
      position: "absolute",
      bottom: 20,
      left: 32,
      right: 32,
      borderTopWidth: 1,
      borderTopColor: "#e5e7eb",
      paddingTop: 6,
      fontSize: 8,
      color: "#6b7280",
      textAlign: "center",
    },
  });

  const totalUnits = lines.reduce((s, l) => s + l.quantity, 0);

  return (
    <Document>
      <Page size={pdf.pageSize ?? "LETTER"} style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>LISTA DE COMPRAS</Text>
            <Text style={styles.sub}>Proveedor: {supplier || "Sin proveedor"}</Text>
            <Text style={styles.sub}>{formatDate(new Date().toISOString())}</Text>
          </View>
          <View>
            <Text style={styles.folio}>{quote.folio}</Text>
            <Text style={styles.sub}>Cotización origen</Text>
          </View>
        </View>

        <View style={styles.info}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Solicita</Text>
            <Text style={styles.cardLine}>{issuer.companyName || "—"}</Text>
            {issuer.address ? <Text style={styles.cardLine}>{issuer.address}</Text> : null}
            {issuer.phone ? <Text style={styles.cardLine}>Tel: {issuer.phone}</Text> : null}
            {issuer.rfc ? <Text style={styles.cardLine}>RFC: {issuer.rfc}</Text> : null}
          </View>
        </View>

        <View style={styles.tableHeader}>
          <Text style={styles.cellNum}>#</Text>
          <Text style={styles.cellPart}>Nº de parte</Text>
          <Text style={styles.cellName}>Producto / Descripción</Text>
          <Text style={styles.cellQty}>Cant.</Text>
          <Text style={styles.cellUnit}>Unidad</Text>
        </View>

        {lines.map((l, i) => (
          <View
            key={l.productId}
            style={pdf.zebra && i % 2 === 1 ? [styles.row, styles.rowAlt] : styles.row}
          >
            <Text style={styles.cellNum}>{i + 1}</Text>
            <Text style={styles.cellPart}>{l.partNumber || "—"}</Text>
            <View style={styles.cellName}>
              <Text style={styles.productName}>{l.name}</Text>
              {l.description ? <Text style={styles.productDesc}>{l.description}</Text> : null}
              <Text style={styles.skuSmall}>SKU: {l.sku}</Text>
            </View>
            <Text style={styles.cellQty}>{l.quantity}</Text>
            <Text style={styles.cellUnit}>{l.unit}</Text>
          </View>
        ))}

        <View style={styles.summary}>
          <Text>{lines.length} ítems distintos</Text>
          <Text style={{ fontWeight: 700 }}>Total unidades: {totalUnits}</Text>
        </View>

        <Text style={styles.footer} fixed>
          {pdf.footerText} · Lista de compras interna · No es una orden de compra formal
        </Text>
      </Page>
    </Document>
  );
}
