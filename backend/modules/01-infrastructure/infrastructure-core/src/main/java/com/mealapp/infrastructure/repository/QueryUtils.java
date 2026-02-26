package com.mealapp.infrastructure.repository;

import com.querydsl.core.types.ExpressionUtils;
import com.querydsl.core.types.Predicate;
import org.springframework.lang.NonNull;

import java.util.Collection;
import java.util.Objects;

public class QueryUtils {

	private QueryUtils() {
	}

	@NonNull
	public static Predicate allOf(Collection<Predicate> predicates) {
		return Objects.requireNonNull(ExpressionUtils.allOf(predicates));
	}

	@NonNull
	public static Predicate and(Predicate left, Predicate right) {
		return ExpressionUtils.and(left, right);
	}

	@NonNull
	public static Predicate or(Predicate left, Predicate right) {
		return ExpressionUtils.or(left, right);
	}

	@NonNull
	public static Predicate anyOf(Collection<Predicate> predicates) {
		return Objects.requireNonNull(ExpressionUtils.anyOf(predicates));
	}

	@NonNull
	public static Predicate allOf(Predicate... predicates) {
		return Objects.requireNonNull(ExpressionUtils.allOf(predicates));
	}

}
