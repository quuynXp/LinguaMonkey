package com.connectJPA.LinguaVietnameseApp.utils;

import org.apache.batik.dom.GenericDOMImplementation;
import org.apache.batik.svggen.SVGGraphics2D;
import org.w3c.dom.DOMImplementation;
import org.w3c.dom.Document;

import java.awt.*;
import java.io.ByteArrayOutputStream;
import java.io.OutputStreamWriter;
import java.io.Writer;
import java.util.UUID;

public class SvgGenerator {

    private static final int IMAGE_SIZE = 250;

    public static byte[] generateThumbnailSvg(String title, UUID id, String type) throws Exception {
        DOMImplementation domImpl = GenericDOMImplementation.getDOMImplementation();
        String svgNamespaceURI = "http://www.w3.org/2000/svg";
        Document document = domImpl.createDocument(svgNamespaceURI, "svg", null);

        SVGGraphics2D svgGenerator = new SVGGraphics2D(document);
        svgGenerator.setSVGCanvasSize(new Dimension(IMAGE_SIZE, IMAGE_SIZE));

        Color bgColor = type.equals("Course") ? new Color(52, 152, 219) : new Color(230, 126, 34);
        Color textColor = Color.WHITE;

        svgGenerator.setPaint(bgColor);
        svgGenerator.fillRect(0, 0, IMAGE_SIZE, IMAGE_SIZE);

        svgGenerator.setPaint(textColor);
        svgGenerator.setStroke(new BasicStroke(2));
        svgGenerator.drawRect(5, 5, IMAGE_SIZE - 10, IMAGE_SIZE - 10);

        String displayTitle = title.length() > 20 ? title.substring(0, 20) + "..." : title;

        Font font = new Font("Arial", Font.BOLD, (int) (IMAGE_SIZE * 0.08));
        svgGenerator.setFont(font);

        FontMetrics fm = svgGenerator.getFontMetrics();
        int titleWidth = fm.stringWidth(displayTitle);
        int titleHeight = fm.getHeight();

        int x = (IMAGE_SIZE - titleWidth) / 2;
        int y = (IMAGE_SIZE / 2) + (titleHeight / 2) - fm.getDescent();

        svgGenerator.drawString(displayTitle, x, y);

        ByteArrayOutputStream bos = new ByteArrayOutputStream();
        Writer out = new OutputStreamWriter(bos, "UTF-8");
        svgGenerator.stream(out, false);
        out.close();

        return bos.toByteArray();
    }
}