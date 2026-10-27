package ru.spasibo.bilt.fdeapi.analytics;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import ru.spasibo.bilt.fdeapi.domain.exception.ValidationException;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;
import static ru.spasibo.bilt.fdeapi.analytics.AnalyticsModels.*;
@Service
@Transactional(readOnly=true, isolation=Isolation.REPEATABLE_READ)
public class AnalyticsService  {
    private final AnalyticsRepository repository;
    private final String zone;
    @Value("${analytics.test-stand:false}") private boolean testStand;
    public AnalyticsService(AnalyticsRepository repository,@Value("${analytics.source-time-zone:UTC}") String zone)  {
        this.repository=repository;
        this.zone=ZoneId.of(zone).getId();
    }
    public Config config() {
        return new Config(zone,testStand);
    }
    Query validate(Query q)  {
        if(q.from()==null || q.to()==null || !q.to().isAfter(q.from()) || Duration.between(q.from(),q.to()).compareTo(Duration.ofDays(366))>0) throw new ValidationException("Период должен быть больше нуля и не превышать 366 дней");
        String bucket=q.bucket()==null?"hour":q.bucket();
        if(!Set.of("hour","day").contains(bucket))throw new ValidationException("Допустимый шаг: hour или day");
        if(bucket.equals("hour") && ChronoUnit.HOURS.between(floor(q.from(),"hour"),q.to().minusNanos(1))+1>400)bucket="day";
        return new Query(q.from(),q.to(),q.pipelineId(),q.clientFrom(),q.clientTo(),q.datacenter(),bucket);
    }
    static LocalDateTime floor(LocalDateTime time,String bucket) {
        return bucket.equals("hour")?time.truncatedTo(ChronoUnit.HOURS):time.toLocalDate().atStartOfDay();
    }
    public Overview overview(Query requested)  {
        Query q=validate(requested);
        var values=repository.series(q);
        List<Point> points=new ArrayList<>();
        Totals summary=new Totals();
        for(LocalDateTime time=floor(q.from(),q.bucket());time.isBefore(q.to());time=q.bucket().equals("hour")?time.plusHours(1):time.plusDays(1))  {
            Totals t=values.getOrDefault(time,new Totals());
            points.add(new Point(time,t));
            summary.add(t);
        }
        List<String> warnings=new ArrayList<>();
        warnings.add("По времени запуска сессии. Файлы и объём — успешные записи операций, без дедупликации.");
        if(!Objects.equals(q.bucket(),requested.bucket()) && requested.bucket()!=null)warnings.add("Шаг укрупнён до дня: не более 400 интервалов.");
        if(summary.unknownSizeFiles()>0)warnings.add("Объём неполон: есть записи с неизвестным или отрицательным размером.");
        if(testStand)warnings.add("Данные тестового стенда с executor-заглушкой.");
        var latest=repository.latest(q);
        return new Overview(summary,points,Instant.now(),zone,q.bucket(),latest[0],latest[1],warnings,repository.extra(q));
    }
    public PipelinePage pipelines(String query,int page,int size)  {
        if(page<0 || size<1 || size>100 || (long)page*size>Integer.MAX_VALUE)throw new ValidationException("Недопустимая страница");
        return repository.pipelines(query,page,size);
    }
    public Page sessions(Query query,int page,int size,String status) {
        return sessions(query,page,size,status,null);
    }
    public Page sessions(Query query,int page,int size,String status,String errorMessage) {
        if(page<0 || size<1 || size>100 || (long)page*size>Integer.MAX_VALUE)throw new ValidationException("Недопустимая страница (размер 1–100)");
        return repository.sessions(validate(query),page,size,status,errorMessage);
    }
}
