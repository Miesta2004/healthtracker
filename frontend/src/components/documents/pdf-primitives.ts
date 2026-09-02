import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { ComponentType, PropsWithChildren } from 'react'
import type { DocumentProps, PageProps, TextProps, ViewProps } from '@react-pdf/renderer'

export const PDFDocument = Document as unknown as ComponentType<PropsWithChildren<DocumentProps>>
export const PDFPage = Page as unknown as ComponentType<PropsWithChildren<PageProps>>
export const PDFText = Text as unknown as ComponentType<PropsWithChildren<TextProps>>
export const PDFView = View as unknown as ComponentType<PropsWithChildren<ViewProps>>
export { StyleSheet }