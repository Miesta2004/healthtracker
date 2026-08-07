"""
Génération PDF pour le module Facturation :
- generer_pdf_facture(facture)  -> bordereau complet (lignes + ventilation)
- generer_pdf_recu(paiement)    -> reçu d'un encaissement précis

Utilise reportlab/platypus. Retourne un BytesIO prêt à être renvoyé dans une
HttpResponse(content_type='application/pdf') — voir views.py.

NB : pas de caractères Unicode sub/superscript (non supportés par les polices
de base de reportlab) — aucun besoin ici, mais on reste sur des balises
<b>/<i> classiques dans les Paragraph pour toute mise en forme.
"""

from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable,
)

from .models import StatutFacture

STYLES = getSampleStyleSheet()
TITRE = ParagraphStyle('Titre', parent=STYLES['Title'], fontSize=16, spaceAfter=2)
SOUS_TITRE = ParagraphStyle('SousTitre', parent=STYLES['Normal'], fontSize=9, textColor=colors.HexColor('#6b7280'))
SECTION = ParagraphStyle('Section', parent=STYLES['Heading3'], fontSize=11, spaceBefore=10, spaceAfter=4)
NORMAL = STYLES['Normal']

COULEUR_PRIMAIRE = colors.HexColor('#0f766e')  # aligné sur --ht-success du frontend


def _formater_montant(montant) -> str:
    return f"{montant:,.0f} FCFA".replace(',', ' ')


def _entete(elements, sous_titre_droite: str):
    elements.append(Paragraph("HealthTracker", TITRE))
    elements.append(Paragraph("Plateforme de gestion hospitalière", SOUS_TITRE))
    elements.append(Spacer(1, 4 * mm))
    elements.append(HRFlowable(width='100%', color=COULEUR_PRIMAIRE, thickness=1.2))
    elements.append(Spacer(1, 4 * mm))
    elements.append(Paragraph(sous_titre_droite, NORMAL))
    elements.append(Spacer(1, 4 * mm))


def generer_pdf_facture(facture) -> BytesIO:
    """Bordereau complet : identité patient, lignes d'actes, ventilation, paiements."""
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        topMargin=18 * mm, bottomMargin=18 * mm, leftMargin=18 * mm, rightMargin=18 * mm,
    )
    elements = []

    _entete(elements, f"<b>Facture N° {facture.numero_facture}</b>")

    infos = [
        ["Patient", f"{facture.patient.prenom} {facture.patient.nom}"],
        ["N° dossier", facture.patient.numero_dossier or '—'],
        ["Date d'émission", facture.date_emission.strftime('%d/%m/%Y')],
        ["Statut", facture.get_statut_display()],
    ]
    if facture.mutuelle_nom:
        infos.append(["Mutuelle / Assurance", f"{facture.mutuelle_nom} ({facture.numero_mutuelle or '—'})"])

    table_infos = Table(infos, colWidths=[45 * mm, 120 * mm])
    table_infos.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#6b7280')),
        ('FONTSIZE', (0, 0), (-1, -1), 9.5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ]))
    elements.append(table_infos)
    elements.append(Spacer(1, 6 * mm))

    elements.append(Paragraph("Détail des actes", SECTION))
    entetes = ['Acte', 'Qté', 'P.U.', 'Montant', 'Part assurance', 'Part patient']
    lignes = [entetes]
    for ligne in facture.lignes.all():
        lignes.append([
            Paragraph(ligne.description, NORMAL),
            str(ligne.quantite),
            _formater_montant(ligne.prix_unitaire),
            _formater_montant(ligne.montant_ligne),
            _formater_montant(ligne.montant_part_assurance_ligne),
            _formater_montant(ligne.montant_part_patient_ligne),
        ])

    table_lignes = Table(lignes, colWidths=[52 * mm, 12 * mm, 24 * mm, 26 * mm, 28 * mm, 28 * mm], repeatRows=1)
    table_lignes.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), COULEUR_PRIMAIRE),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 8.5),
        ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
        ('GRID', (0, 0), (-1, -1), 0.4, colors.HexColor('#e5e7eb')),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f9fafb')]),
    ]))
    elements.append(table_lignes)
    elements.append(Spacer(1, 6 * mm))

    recap = [
        ['Montant total', _formater_montant(facture.montant_total)],
        ['Part assurance', _formater_montant(facture.montant_part_assurance)],
        ['Part patient (ticket modérateur)', _formater_montant(facture.montant_part_patient)],
        ['Déjà payé', _formater_montant(facture.montant_paye)],
        ['Restant dû', _formater_montant(facture.montant_restant)],
    ]
    table_recap = Table(recap, colWidths=[100 * mm, 40 * mm])
    table_recap.setStyle(TableStyle([
        ('FONTSIZE', (0, 0), (-1, -1), 9.5),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('LINEABOVE', (0, -1), (-1, -1), 0.8, colors.HexColor('#111827')),
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ('TOPPADDING', (0, -1), (-1, -1), 5),
    ]))
    elements.append(table_recap)

    if hasattr(facture, 'echeancier'):
        elements.append(Spacer(1, 6 * mm))
        elements.append(Paragraph("Échéancier de paiement", SECTION))
        ech_rows = [['N°', 'Date', 'Montant prévu', 'Statut']]
        for e in facture.echeancier.echeances.all():
            ech_rows.append([
                str(e.numero_echeance), e.date_echeance.strftime('%d/%m/%Y'),
                _formater_montant(e.montant_prevu), e.get_statut_display(),
            ])
        table_ech = Table(ech_rows, colWidths=[15 * mm, 35 * mm, 40 * mm, 40 * mm])
        table_ech.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f3f4f6')),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8.5),
            ('GRID', (0, 0), (-1, -1), 0.4, colors.HexColor('#e5e7eb')),
        ]))
        elements.append(table_ech)

    doc.build(elements)
    buffer.seek(0)
    return buffer


def generer_pdf_recu(paiement) -> BytesIO:
    """Reçu d'un encaissement précis — document court remis au guichet."""
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        topMargin=18 * mm, bottomMargin=18 * mm, leftMargin=18 * mm, rightMargin=18 * mm,
    )
    elements = []
    facture = paiement.facture

    _entete(elements, f"<b>Reçu de paiement</b> — Facture N° {facture.numero_facture}")

    infos = [
        ["Patient", f"{facture.patient.prenom} {facture.patient.nom}"],
        ["Montant encaissé", _formater_montant(paiement.montant)],
        ["Mode de paiement", paiement.get_mode_paiement_display()],
    ]
    if paiement.operateur_mobile_money:
        infos.append(["Opérateur", paiement.get_operateur_mobile_money_display()])
    if paiement.reference_transaction:
        infos.append(["Référence", paiement.reference_transaction])
    infos.append(["Date", paiement.date_paiement.strftime('%d/%m/%Y %H:%M')])
    if paiement.encaisse_par:
        infos.append(["Encaissé par", f"{paiement.encaisse_par.prenom} {paiement.encaisse_par.nom}"])
    infos.append(["Restant dû après ce paiement", _formater_montant(facture.montant_restant)])

    table_infos = Table(infos, colWidths=[55 * mm, 110 * mm])
    table_infos.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#6b7280')),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LINEBELOW', (0, 0), (-1, -2), 0.3, colors.HexColor('#e5e7eb')),
    ]))
    elements.append(table_infos)
    elements.append(Spacer(1, 10 * mm))
    elements.append(Paragraph(
        "<i>Ce reçu fait foi de paiement pour le montant et la date indiqués ci-dessus.</i>",
        SOUS_TITRE,
    ))

    doc.build(elements)
    buffer.seek(0)
    return buffer