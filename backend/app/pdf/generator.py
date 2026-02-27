from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from datetime import datetime
import os

PDF_DIR = "generated_pdfs"
os.makedirs(PDF_DIR, exist_ok=True)

def generate_pdf(data, estimate_id):
    """Generate a professional estimation PDF based on the Dream House Interior form"""
    filename = f"{PDF_DIR}/estimate_{estimate_id}.pdf"
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=18,
        textColor=colors.HexColor('#0b4f4a'),
        spaceAfter=6,
        alignment=1  # Center
    )
    
    subtitle_style = ParagraphStyle(
        'CustomSubtitle',
        parent=styles['Normal'],
        fontSize=12,
        textColor=colors.HexColor('#1f2933'),
        spaceAfter=2,
        alignment=1
    )
    
    header_style = ParagraphStyle(
        'Header',
        parent=styles['Normal'],
        fontSize=9,
        textColor=colors.HexColor('#1f2933'),
        spaceAfter=1
    )
    
    def add_branding(canvas, doc_obj):
        canvas.saveState()
        width, height = doc_obj.pagesize
        canvas.setFont("Helvetica", 8)
        canvas.setFillColor(colors.HexColor("#0b4f4a"))
        canvas.drawString(0.6 * inch, height - 0.35 * inch, "Dream House Interior")
        canvas.setStrokeColor(colors.HexColor("#d1d5db"))
        canvas.setLineWidth(0.5)
        canvas.line(0.6 * inch, height - 0.45 * inch, width - 0.6 * inch, height - 0.45 * inch)
        canvas.drawRightString(
            width - 0.6 * inch,
            0.35 * inch,
            f"Generated on {datetime.now().strftime('%d-%m-%Y %H:%M')}",
        )
        canvas.restoreState()

    doc = SimpleDocTemplate(
        filename,
        pagesize=landscape(A4),
        topMargin=0.6 * inch,
        bottomMargin=0.6 * inch,
    )
    elements = []
    
    # Title
    elements.append(Paragraph("Estimation Form", title_style))
    elements.append(Paragraph("Dream House Interior", subtitle_style))
    elements.append(Spacer(1, 12))
    
    # Header Information
    party_name = data.get("party_name", "N/A")
    contractor_name = data.get("contractor_name", "N/A")
    mobile = data.get("mobile_number", "N/A")
    location = data.get("location", "N/A")
    date_str = data.get("date", datetime.now().strftime("%d-%m-%Y"))
    currency_code = data.get("currency_code", "INR")
    exchange_rate = data.get("exchange_rate", 1.0)
    if isinstance(date_str, datetime):
        date_str = date_str.strftime("%d-%m-%Y")
    
    header_info = f"""
    <b>Location:</b> {location}<br/>
    <b>Party Name:</b> {party_name}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<b>Mobile Number:</b> {mobile}<br/>
    <b>Contractor Name:</b> {contractor_name}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<b>Date:</b> {date_str}<br/>
    <b>Currency:</b> {currency_code}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<b>Exchange Rate:</b> {exchange_rate}
    """
    elements.append(Paragraph(header_info, header_style))
    elements.append(Spacer(1, 12))
    
    # Items Table with categories and profit columns
    table_data = [[
        "S.I.N°",
        "Category",
        "Description",
        "Size",
        "S.F.T",
        "Rate",
        "Cost",
        "Amount",
        "Profit",
        "Total",
    ]]

    items = data.get("items", []) or []
    # Group by category
    grouped = {}
    for item in items:
        category = item.get("category") or "Uncategorized"
        grouped.setdefault(category, []).append(item)

    for category, group_items in grouped.items():
        subtotal = 0
        for item in group_items:
            serial_no = str(item.get("serial_number", ""))
            description = str(item.get("description", ""))
            size = str(item.get("size", "-"))
            sft = f"{item.get('sft', 0):.1f}" if item.get('sft') else "-"
            rate = f"{item.get('rate', 0):.2f}" if item.get('rate') else "-"
            cost = f"{item.get('cost_rate', 0):.2f}" if item.get('cost_rate') else "-"
            amount = item.get('amount', 0) or 0
            profit = item.get('profit', 0) or 0
            total = item.get('total', item.get('amount', 0)) or 0

            subtotal += total

            table_data.append([
                serial_no,
                category,
                description,
                size,
                sft,
                rate,
                cost,
                f"{amount:.2f}",
                f"{profit:.2f}",
                f"{total:.2f}",
            ])

        # Subtotal row for category
        table_data.append([
            "",
            category,
            "Subtotal",
            "",
            "",
            "",
            "",
            "",
            "",
            f"{subtotal:.2f}",
        ])
    
    # Create and style table
    table = Table(
        table_data,
        colWidths=[
            0.5 * inch,
            1.1 * inch,
            2.2 * inch,
            0.9 * inch,
            0.6 * inch,
            0.6 * inch,
            0.6 * inch,
            0.8 * inch,
            0.8 * inch,
            0.8 * inch,
        ],
    )
    table.setStyle(TableStyle([
        # Header row
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0f766e')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 8),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
        
        # Data rows
        ('ALIGN', (0, 1), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 7),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f5f4f0')]),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        
        # Align text columns left
        ('ALIGN', (1, 1), (2, -1), 'LEFT'),
    ]))
    
    elements.append(table)
    elements.append(Spacer(1, 12))
    
    # Financial Summary
    gross = data.get("gross", 0)
    discount = data.get("discount", 0)
    tax_percent = data.get("tax_percent", 0)
    tax_amount = data.get("tax_amount", 0)
    advance = data.get("advance", 0)
    final = data.get("final", 0)
    profit = data.get("profit", 0)
    
    summary_data = [
        ["Gross Total", f"{currency_code} {gross:,.2f}"],
        ["Discount (%)", f"{discount:.1f}%"],
        ["Tax (%)", f"{tax_percent:.1f}%"],
        ["Tax Amount", f"{currency_code} {tax_amount:,.2f}"],
        ["Advance Payment", f"{currency_code} {advance:,.2f}"],
        ["Profit", f"{currency_code} {profit:,.2f}"],
        ["Final Total", f"{currency_code} {final:,.2f}"],
    ]
    
    summary_table = Table(
        summary_data,
        colWidths=[2.6 * inch, 2.0 * inch],
        rowHeights=[0.34 * inch] * len(summary_data),
    )
    summary_table.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 0.6, colors.HexColor('#d1d5db')),
        ('INNERGRID', (0, 0), (-1, -1), 0.4, colors.HexColor('#e5e7eb')),
        ('BACKGROUND', (0, 0), (-1, -2), colors.HexColor('#f8fafc')),
        ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica'),
        ('FONTNAME', (1, 0), (1, 5), 'Helvetica'),
        ('FONTNAME', (1, 6), (1, 6), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (1, 5), 9),
        ('FONTSIZE', (0, 6), (1, 6), 11),
        ('TEXTCOLOR', (0, 0), (1, 5), colors.HexColor('#1f2933')),
        ('BACKGROUND', (0, 6), (1, 6), colors.HexColor('#0f766e')),
        ('TEXTCOLOR', (0, 6), (1, 6), colors.white),
        ('TOPPADDING', (0, 0), (1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (1, -1), 6),
    ]))
    
    elements.append(summary_table)
    
    # Build PDF
    doc.build(elements, onFirstPage=add_branding, onLaterPages=add_branding)
    return filename
