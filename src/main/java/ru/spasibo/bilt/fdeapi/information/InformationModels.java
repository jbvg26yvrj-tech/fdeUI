package ru.spasibo.bilt.fdeapi.information;
import java.util.List;
public final class InformationModels {
    private InformationModels() {}
    public enum Audience { ALL, ADMIN }
    public record Link(String label,String url) {}
    public record Block(String id,String title,String body,List<Link> links,Audience audience) {}
    public record Document(long version,List<Block> blocks) {}
}
