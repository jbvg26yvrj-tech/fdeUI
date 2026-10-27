package ru.spasibo.bilt.fdeapi.information;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.net.URI;
import java.util.*;
import static ru.spasibo.bilt.fdeapi.information.InformationModels.*;
@Service
public class InformationService {
    private final InformationRepository repository;
    public InformationService(InformationRepository repository) { this.repository=repository; }
    public Document read(boolean admin) {
        var document=repository.read();
        return new Document(document.version(),document.blocks().stream().filter(b->b.audience()==Audience.ALL || admin).toList());
    }
    @Transactional public Document save(Document draft) {
        validate(draft);
        if(!repository.save(draft)) throw new InformationConflictException();
        return new Document(draft.version()+1,draft.blocks());
    }
    static void validate(Document document) {
        if(document==null || document.version()<0 || document.blocks()==null || document.blocks().size()>20) throw invalid();
        Set<String> ids=new HashSet<>();
        for(var block:document.blocks()) {
            if(block==null || block.audience()==null || block.id()==null || !block.id().matches("[A-Za-z0-9_-]{1,64}") || !ids.add(block.id())) throw invalid();
            text(block.title(),160,true); text(block.body(),10000,false);
            if(block.links()==null || block.links().size()>10) throw invalid();
            for(var link:block.links()) {
                if(link==null) throw invalid();
                text(link.label(),160,true); text(link.url(),2048,true);
                try {
                    URI uri=new URI(link.url());
                    if(!Set.of("http","https").contains(uri.getScheme()==null ? "" : uri.getScheme().toLowerCase(Locale.ROOT)) || uri.getHost()==null || uri.getRawUserInfo()!=null || uri.getPort()>65535 || uri.getPort()==0 || link.url().contains("\\")) throw invalid();
                } catch(java.net.URISyntaxException e) { throw invalid(); }
            }
        }
    }
    private static void text(String value,int max,boolean required) { if(value==null || value.length()>max || (required && value.isBlank()) || value.chars().anyMatch(c->c==0)) throw invalid(); }
    private static IllegalArgumentException invalid() { return new IllegalArgumentException("Проверьте информацию: до 20 разделов, заголовки до 160 знаков, текст до 10000, до 10 ссылок HTTP(S) без логина и пароля на раздел."); }
}
