package ru.spasibo.bilt.fdeapi.information;

import org.junit.jupiter.api.Test;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static ru.spasibo.bilt.fdeapi.information.InformationModels.*;
class InformationServiceTest {
    final InformationRepository repository=mock(InformationRepository.class);
    final InformationService service=new InformationService(repository);
    Block block(Audience audience,String url) { return new Block("guide","Руководство","Текст",List.of(new Link("Открыть",url)),audience); }
    @Test void filtersAdminContentOnServer() {
        when(repository.read()).thenReturn(new Document(3,List.of(block(Audience.ALL,"https://docs.example"),new Block("admin","Admin","Private",List.of(),Audience.ADMIN))));
        assertThat(service.read(false).blocks()).extracting(Block::id).containsExactly("guide");
        assertThat(service.read(true).blocks()).hasSize(2);
    }
    @Test void validatesUrlsAndBoundsBeforeSaving() {
        for(String url:List.of("javascript:alert(1)","data:text/html,x","https://user:pass@docs.example","//docs.example","https://docs.example\\evil"))
            assertThatThrownBy(()->service.save(new Document(0,List.of(block(Audience.ALL,url))))).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(()->service.save(new Document(0,Collections.nCopies(21,block(Audience.ALL,"https://docs.example"))))).isInstanceOf(IllegalArgumentException.class);
        verifyNoInteractions(repository);
    }
    @Test void rejectsDuplicateIdsAndNullAudience() {
        var b=block(Audience.ALL,"https://docs.example");
        assertThatThrownBy(()->service.save(new Document(0,List.of(b,b)))).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(()->service.save(new Document(0,List.of(block(null,"https://docs.example"))))).isInstanceOf(IllegalArgumentException.class);
    }
    @Test void savesOrderedDocumentAndDetectsConflict() {
        var draft=new Document(4,List.of(block(Audience.ALL,"https://docs.example/help?q=1#topic")));
        when(repository.save(draft)).thenReturn(true);
        assertThat(service.save(draft)).isEqualTo(new Document(5,draft.blocks()));
        when(repository.save(draft)).thenReturn(false);
        assertThatThrownBy(()->service.save(draft)).isInstanceOf(InformationConflictException.class);
    }
}
