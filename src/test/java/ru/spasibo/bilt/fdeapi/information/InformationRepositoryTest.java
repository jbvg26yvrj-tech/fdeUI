package ru.spasibo.bilt.fdeapi.information;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import java.util.List;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
class InformationRepositoryTest {
    @Test void persistenceUsesAtomicVersionConditionAndSerializedOrderedBlocks() {
        var jdbc=mock(JdbcTemplate.class); var repository=new InformationRepository(jdbc,new ObjectMapper());
        var draft=new InformationModels.Document(8,List.of(new InformationModels.Block("a","Title","Body",List.of(),InformationModels.Audience.ALL)));
        String sql="update public.system_information set blocks=cast(? as jsonb),version=version+1,updated_at=current_timestamp where id=1 and version=?";
        String blocks="[{\"id\":\"a\",\"title\":\"Title\",\"body\":\"Body\",\"links\":[],\"audience\":\"ALL\"}]";
        when(jdbc.update(sql,blocks,8L)).thenReturn(1,0);
        assertThat(repository.save(draft)).isTrue(); assertThat(repository.save(draft)).isFalse();
    }
}
