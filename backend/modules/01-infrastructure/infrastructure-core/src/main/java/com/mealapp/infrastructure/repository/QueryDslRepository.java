package com.mealapp.infrastructure.repository;

import com.querydsl.core.types.OrderSpecifier;
import com.querydsl.core.types.Predicate;
import org.springframework.data.domain.Sort;
import org.springframework.data.querydsl.QuerydslPredicateExecutor;
import org.springframework.data.repository.NoRepositoryBean;
import org.springframework.lang.NonNull;

import java.util.List;

@NoRepositoryBean
public interface QueryDslRepository<T> extends QuerydslPredicateExecutor<T>, QueryDslCustomSelector<T> {

	@Override
	@NonNull
	List<T> findAll(@NonNull Predicate predicate);

	@Override
	@NonNull
	List<T> findAll(@NonNull Predicate predicate, @NonNull Sort sort);

	@Override
	@NonNull
	List<T> findAll(@NonNull Predicate predicate, @NonNull OrderSpecifier<?>... orders);

	@Override
	@NonNull
	List<T> findAll(@NonNull OrderSpecifier<?>... orders);

}
