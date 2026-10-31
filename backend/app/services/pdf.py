import io
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from app.models.invoice import Invoice


def generate_invoice_pdf(invoice: Invoice) -> io.BytesIO:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36,
    )

    styles = getSampleStyleSheet()
    header_style = ParagraphStyle(
        "HeaderTitle",
        parent=styles["Heading1"],
        fontSize=20,
        leading=24,
        textColor=colors.HexColor("#0f172a"),
    )
    meta_style = ParagraphStyle(
        "MetaText",
        parent=styles["Normal"],
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#475569"),
    )
    bold_style = ParagraphStyle(
        "BoldText",
        parent=styles["Normal"],
        fontSize=9,
        leading=13,
        fontName="Helvetica-Bold",
        textColor=colors.HexColor("#0f172a"),
    )

    elements = []

    # 1. Company Header & Invoice Title
    header_data = [
        [
            Paragraph("<b>BRIGHTLOOP SOFTWARE</b><br/>Subscription Management Platform<br/>Email: billing@brightloop.com", meta_style),
            Paragraph(f"<b>INVOICE</b><br/><b>#{invoice.invoice_number}</b><br/>Status: <b>{invoice.status.upper()}</b>", header_style),
        ]
    ]
    header_table = Table(header_data, colWidths=[320, 220])
    header_table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("ALIGN", (1, 0), (1, 0), "RIGHT"),
            ]
        )
    )
    elements.append(header_table)
    elements.append(Spacer(1, 18))

    # 2. Bill To & Invoice Details Table
    cust = invoice.customer
    customer_info = (
        f"<b>Bill To:</b><br/>"
        f"{cust.name}<br/>"
        f"Email: {cust.email}<br/>"
        f"{cust.city or ''} {cust.country or ''}"
    )

    sub_ref = invoice.subscription.subscription_number if invoice.subscription else "N/A"
    terms = invoice.subscription.payment_terms if invoice.subscription else "Immediate"

    invoice_info = (
        f"<b>Issue Date:</b> {invoice.issue_date.isoformat()}<br/>"
        f"<b>Due Date:</b> {invoice.due_date.isoformat()}<br/>"
        f"<b>Billing Period:</b> {invoice.billing_period_start.isoformat()} to {invoice.billing_period_end.isoformat()}<br/>"
        f"<b>Subscription:</b> {sub_ref}<br/>"
        f"<b>Payment Terms:</b> {terms}"
    )

    details_data = [
        [
            Paragraph(customer_info, meta_style),
            Paragraph(invoice_info, meta_style),
        ]
    ]
    details_table = Table(details_data, colWidths=[270, 270])
    details_table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
                ("PADDING", (0, 0), (-1, -1), 8),
                ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ]
        )
    )
    elements.append(details_table)
    elements.append(Spacer(1, 18))

    # 3. Line Items Table
    lines_header = ["Description", "Qty", "Unit Price", "Discount", "Tax", "Total"]
    lines_data = [[Paragraph(f"<b>{h}</b>", bold_style) for h in lines_header]]

    for line in invoice.lines:
        lines_data.append(
            [
                Paragraph(line.description, meta_style),
                Paragraph(str(line.quantity), meta_style),
                Paragraph(f"{line.unit_price:.2f}", meta_style),
                Paragraph(f"-{line.discount_amount:.2f}", meta_style),
                Paragraph(f"{line.tax_amount:.2f}", meta_style),
                Paragraph(f"{line.total_amount:.2f}", bold_style),
            ]
        )

    lines_table = Table(lines_data, colWidths=[200, 45, 75, 70, 70, 80])
    lines_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f1f5f9")),
                ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("PADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    elements.append(lines_table)
    elements.append(Spacer(1, 14))

    # 4. Totals & Balances
    totals_data = [
        ["Subtotal:", f"{invoice.subtotal:.2f}"],
        ["Discount:", f"-{invoice.discount_amount:.2f}"],
        ["Tax:", f"{invoice.tax_amount:.2f}"],
        ["Total Amount Due:", f"{invoice.total_amount:.2f}"],
        ["Amount Paid:", f"{invoice.amount_paid:.2f}"],
        ["Outstanding Balance:", f"{invoice.outstanding_balance:.2f}"],
    ]
    totals_table = Table(totals_data, colWidths=[420, 120])
    totals_table.setStyle(
        TableStyle(
            [
                ("ALIGN", (0, 0), (-1, -1), "RIGHT"),
                ("FONTNAME", (0, 3), (-1, 3), "Helvetica-Bold"),
                ("FONTNAME", (0, 5), (-1, 5), "Helvetica-Bold"),
                ("TEXTCOLOR", (0, 5), (-1, 5), colors.HexColor("#dc2626") if invoice.outstanding_balance > 0 else colors.HexColor("#16a34a")),
                ("PADDING", (0, 0), (-1, -1), 3),
            ]
        )
    )
    elements.append(totals_table)

    # 5. Payment History (if any)
    if invoice.payments:
        elements.append(Spacer(1, 16))
        elements.append(Paragraph("<b>Recorded Payments</b>", bold_style))
        elements.append(Spacer(1, 6))

        pay_header = ["Receipt #", "Method", "Date", "Notes", "Amount"]
        pay_data = [[Paragraph(f"<b>{h}</b>", bold_style) for h in pay_header]]
        for p in invoice.payments:
            pay_data.append(
                [
                    Paragraph(p.payment_number, meta_style),
                    Paragraph(p.payment_method.replace("_", " ").title(), meta_style),
                    Paragraph(p.payment_date.isoformat(), meta_style),
                    Paragraph(p.notes or "-", meta_style),
                    Paragraph(f"{p.amount:.2f}", bold_style),
                ]
            )
        pay_table = Table(pay_data, colWidths=[120, 90, 80, 160, 90])
        pay_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f8fafc")),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
                    ("ALIGN", (-1, 0), (-1, -1), "RIGHT"),
                    ("PADDING", (0, 0), (-1, -1), 5),
                ]
            )
        )
        elements.append(pay_table)

    doc.build(elements)
    buffer.seek(0)
    return buffer
